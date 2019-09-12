---
title: 从谷歌官方TODO-MVP看MVP模式
date: 2016-06-27 15:47:01
tags:
 - 设计模式
---

## 前言
很早之前就听说过android MVP的模式，也看过许许多多的文章，但是众说纷纭，每个人有每个人的理解，如果光看，可能并不能很深刻的理解。但是作为android界的权威，Google出了一个MVP的官方例子。若是从这个例子来看MVP模式，或许会有不一样的感悟呢？多说无益，下面开始。

## 代码准备
Github上打开[googlesamples/android-architecture](https://github.com/googlesamples/android-architecture)，打开分支，选择``todo-mvp``（Basic Model-View-Presenter architecture），然后下载zip，解压后导入到AS中。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/mvp3.png)

<!-- more -->

## 代码分析
首先贴一张官方的MVP示意图：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/mvp1.png)
在分析代码之前，我们先简单的运行一下App，大致有一个感觉，App里有哪些功能。
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/mvpeffect.gif)
ok，下面进入到代码里，先上一下代码结构图：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/mvp2.png)
可以看到分包是根据模块进行的分包，通过gif图大概可以知道分为添加（编辑）、统计、详情、主页List。
本文只为了分析mvp的使用，所以我选取最简单的AddEditTask来进行分析。

### M
M主要是位于data包下面的类，Task是基本的bean，涉及到数据的相关操作由接口``TasksDataSource``体现。
```
public interface TasksDataSource {

    interface LoadTasksCallback {

        void onTasksLoaded(List<Task> tasks);

        void onDataNotAvailable();
    }

    interface GetTaskCallback {

        void onTaskLoaded(Task task);

        void onDataNotAvailable();
    }

    void getTasks(@NonNull LoadTasksCallback callback);

    void getTask(@NonNull String taskId, @NonNull GetTaskCallback callback);

    void saveTask(@NonNull Task task);

    void completeTask(@NonNull Task task);

    void completeTask(@NonNull String taskId);

    void activateTask(@NonNull Task task);

    void activateTask(@NonNull String taskId);

    void clearCompletedTasks();

    void refreshTasks();

    void deleteAllTasks();

    void deleteTask(@NonNull String taskId);
}
```
### V
首先是V的基类：
```
public interface BaseView<T> {

    void setPresenter(T presenter);

}
```
然后看到``AddEditTaskContract``:
```
public interface AddEditTaskContract {

    interface View extends BaseView<Presenter> {

        void showEmptyTaskError();

        void showTasksList();

        void setTitle(String title);

        void setDescription(String description);

        boolean isActive();
    }

    interface Presenter extends BasePresenter {

        void saveTask(String title, String description);

        void populateTask();
    }
}
```
这个类将V、P整合在了一起，这样做的好处是可以很方便的看到V、P都有哪些方法，方便后面修改。其中的``View``则是BaseView的下一层接口，它定义了View相关的一些方法。

### P
P的基类：
```
public interface BasePresenter {

    void start();

}
```
然后在``AddEditTaskContract``中我们也可以看到P的具体声明。

### MVP综合分析
MVP大致的代码便是如此了，下面来看具体的实现。
在``AddEditTaskActivity``的onCreate()方法中，我们重点看到这一句代码：
```
new AddEditTaskPresenter(
    taskId,
    Injection.provideTasksRepository(getApplicationContext()),
    addEditTaskFragment);
```
可以知道，这句代码便是创建具体的P了。
来看下一下``AddEditTaskPresenter``的代码：
```
/**
 * Listens to user actions from the UI ({@link AddEditTaskFragment}), retrieves the data and updates
 * the UI as required.
 */
public class AddEditTaskPresenter implements AddEditTaskContract.Presenter,
        TasksDataSource.GetTaskCallback {

    @NonNull
    private final TasksDataSource mTasksRepository;

    @NonNull
    private final AddEditTaskContract.View mAddTaskView;

    @Nullable
    private String mTaskId;

    /**
     * Creates a presenter for the add/edit view.
     *
     * @param taskId ID of the task to edit or null for a new task
     * @param tasksRepository a repository of data for tasks
     * @param addTaskView the add/edit view
     */
    public AddEditTaskPresenter(@Nullable String taskId, @NonNull TasksDataSource tasksRepository,
            @NonNull AddEditTaskContract.View addTaskView) {
        mTaskId = taskId;
        mTasksRepository = checkNotNull(tasksRepository);
        mAddTaskView = checkNotNull(addTaskView);

        mAddTaskView.setPresenter(this);
    }

    @Override
    public void start() {
        if (!isNewTask()) {
            populateTask();
        }
    }

    @Override
    public void saveTask(String title, String description) {
        if (isNewTask()) {
            createTask(title, description);
        } else {
            updateTask(title, description);
        }
    }

    @Override
    public void populateTask() {
        if (isNewTask()) {
            throw new RuntimeException("populateTask() was called but task is new.");
        }
        mTasksRepository.getTask(mTaskId, this);
    }

    @Override
    public void onTaskLoaded(Task task) {
        // The view may not be able to handle UI updates anymore
        if (mAddTaskView.isActive()) {
            mAddTaskView.setTitle(task.getTitle());
            mAddTaskView.setDescription(task.getDescription());
        }
    }

    @Override
    public void onDataNotAvailable() {
        // The view may not be able to handle UI updates anymore
        if (mAddTaskView.isActive()) {
            mAddTaskView.showEmptyTaskError();
        }
    }

    private boolean isNewTask() {
        return mTaskId == null;
    }

    private void createTask(String title, String description) {
        Task newTask = new Task(title, description);
        if (newTask.isEmpty()) {
            mAddTaskView.showEmptyTaskError();
        } else {
            mTasksRepository.saveTask(newTask);
            mAddTaskView.showTasksList();
        }
    }

    private void updateTask(String title, String description) {
        if (isNewTask()) {
            throw new RuntimeException("updateTask() was called but task is new.");
        }
        mTasksRepository.saveTask(new Task(title, description, mTaskId));
        mAddTaskView.showTasksList(); // After an edit, go back to the list.
    }
}
```
我们通过其构造函数，传入了一个addEditTaskFragment对象，通过其构造函数的方法，我们可以猜测：AddEditTaskFragment便是具体的V了。
并且注意``mAddTaskView.setPresenter(this);``这句代码，即是在P创建的时候，V、P便实现了绑定。
看到``AddEditTaskFragment``代码：
```
public class AddEditTaskFragment extends Fragment implements AddEditTaskContract.View {

    public static final String ARGUMENT_EDIT_TASK_ID = "EDIT_TASK_ID";

    private AddEditTaskContract.Presenter mPresenter;

    private TextView mTitle;

    private TextView mDescription;

    public static AddEditTaskFragment newInstance() {
        return new AddEditTaskFragment();
    }

    public AddEditTaskFragment() {
        // Required empty public constructor
    }

    @Override
    public void onResume() {
        super.onResume();
        mPresenter.start();
    }

    @Override
    public void setPresenter(@NonNull AddEditTaskContract.Presenter presenter) {
        mPresenter = checkNotNull(presenter);
    }

    @Override
    public void onActivityCreated(Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);

        FloatingActionButton fab =
                (FloatingActionButton) getActivity().findViewById(R.id.fab_edit_task_done);
        fab.setImageResource(R.drawable.ic_done);
        fab.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mPresenter.saveTask(mTitle.getText().toString(), mDescription.getText().toString());
            }
        });
    }

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        View root = inflater.inflate(R.layout.addtask_frag, container, false);
        mTitle = (TextView) root.findViewById(R.id.add_task_title);
        mDescription = (TextView) root.findViewById(R.id.add_task_description);

        setHasOptionsMenu(true);
        setRetainInstance(true);
        return root;
    }

    @Override
    public void showEmptyTaskError() {
        Snackbar.make(mTitle, getString(R.string.empty_task_message), Snackbar.LENGTH_LONG).show();
    }

    @Override
    public void showTasksList() {
        getActivity().setResult(Activity.RESULT_OK);
        getActivity().finish();
    }

    @Override
    public void setTitle(String title) {
        mTitle.setText(title);
    }

    @Override
    public void setDescription(String description) {
        mDescription.setText(description);
    }

    @Override
    public boolean isActive() {
        return isAdded();
    }
}
```

通过前面的gif图，可以猜测P中必定是有一个保存Task的方法，即``saveTask``方法，在我们点击悬浮按钮的时候会触发。即我们的操作（业务逻辑相关）会由P来执行。
看到P中``saveTask``的具体实现，他会判断当前是否是一个新任务，若是则调用``createTask``创建新的Task，若标题与内容都为空，则会回调V的``showEmptyTaskError``方法来显示相关的UI，若不为空，则执行M的操作：``mTasksRepository.saveTask(newTask);``保存相应的数据，然后回调V的``showTasksList``方法来显示相关UI。若不是一个新的Task（编辑），则调用``updateTask``，执行M操作``mTasksRepository.saveTask``来操作数据。
至此，一个完整的业务操作（新建或编辑一个新的Task）分析完毕。可以看到在V中，我们只调用P的相关的接口，然后实现上层V的接口就可以了。由P来调用M中的方法，来操作数据，然后通过回调来使V展示相应的界面。V与M完全分离，整套业务都由P来执行。
最后上一张分析图：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/mvp5.png)

## MVP的优缺点
优点：
1. 解耦。实现了Model和View真正的完全分离，再也不是Activity中一大坨代码了。
2. 清晰。模块职责划分明显，层次清晰。
3. 测试。在使用MVP的项目中Presenter对View是通过接口进行，在对Presenter进行不依赖UI环境的单元测试的时候。可以通过模拟一个View对象，这个对象只需要实现了View的接口即可。然后注入到Presenter中，单元测试的时候就可以完整的测试Presenter应用逻辑的正确性。
4. 组件化。在MVP当中，View不依赖Model，这样就可以让View从特定的业务场景中脱离出来，可以说View可以做到对业务完全无知，它只需要提供一系列接口提供给上层操作，这样就可以做到高度可复用的View组件。

缺点：
1. 新增很多接口类，额外的代码复杂度及学习成本。
2. Presenter中除了业务逻辑以外，可能还有大量的与业务无关的数据操作逻辑，会导致Presenter比较臃肿。

## 测试
在代码中，Google已经写好了测试代码：
```
public class AddEditTaskPresenterTest {

    @Mock
    private TasksRepository mTasksRepository;

    @Mock
    private AddEditTaskContract.View mAddEditTaskView;

    /**
     * {@link ArgumentCaptor} is a powerful Mockito API to capture argument values and use them to
     * perform further actions or assertions on them.
     */
    @Captor
    private ArgumentCaptor<TasksDataSource.GetTaskCallback> mGetTaskCallbackCaptor;

    private AddEditTaskPresenter mAddEditTaskPresenter;

    @Before
    public void setupMocksAndView() {
        // Mockito has a very convenient way to inject mocks by using the @Mock annotation. To
        // inject the mocks in the test the initMocks method needs to be called.
        MockitoAnnotations.initMocks(this);

        // The presenter wont't update the view unless it's active.
        when(mAddEditTaskView.isActive()).thenReturn(true);
    }

    @Test
    public void saveNewTaskToRepository_showsSuccessMessageUi() {
        // Get a reference to the class under test
        mAddEditTaskPresenter = new AddEditTaskPresenter("1", mTasksRepository, mAddEditTaskView);

        // When the presenter is asked to save a task
        mAddEditTaskPresenter.saveTask("New Task Title", "Some Task Description");

        // Then a task is saved in the repository and the view updated
        verify(mTasksRepository).saveTask(any(Task.class)); // saved to the model
        verify(mAddEditTaskView).showTasksList(); // shown in the UI
    }

    @Test
    public void saveTask_emptyTaskShowsErrorUi() {
        // Get a reference to the class under test
        mAddEditTaskPresenter = new AddEditTaskPresenter(null, mTasksRepository, mAddEditTaskView);

        // When the presenter is asked to save an empty task
        mAddEditTaskPresenter.saveTask("", "");

        // Then an empty not error is shown in the UI
        verify(mAddEditTaskView).showEmptyTaskError();
    }

    @Test
    public void saveExistingTaskToRepository_showsSuccessMessageUi() {
        // Get a reference to the class under test
        mAddEditTaskPresenter = new AddEditTaskPresenter("1", mTasksRepository, mAddEditTaskView);

        // When the presenter is asked to save an existing task
        mAddEditTaskPresenter.saveTask("New Task Title", "Some Task Description");

        // Then a task is saved in the repository and the view updated
        verify(mTasksRepository).saveTask(any(Task.class)); // saved to the model
        verify(mAddEditTaskView).showTasksList(); // shown in the UI
    }

    @Test
    public void populateTask_callsRepoAndUpdatesView() {
        Task testTask = new Task("TITLE", "DESCRIPTION");
        // Get a reference to the class under test
        mAddEditTaskPresenter = new AddEditTaskPresenter(testTask.getId(),
                mTasksRepository, mAddEditTaskView);

        // When the presenter is asked to populate an existing task
        mAddEditTaskPresenter.populateTask();

        // Then the task repository is queried and the view updated
        verify(mTasksRepository).getTask(eq(testTask.getId()), mGetTaskCallbackCaptor.capture());

        // Simulate callback
        mGetTaskCallbackCaptor.getValue().onTaskLoaded(testTask);

        verify(mAddEditTaskView).setTitle(testTask.getTitle());
        verify(mAddEditTaskView).setDescription(testTask.getDescription());
    }
}
```
来执行一下吧：
![](https://images-1258496336.cos.ap-chengdu.myqcloud.com/2016/06/mvp4.png)
可以看到测试成功。
那么假设我们采用传统的开发模式，代码全在Activity里，要怎么样测试呢？噢，想想就觉得头大了，是吗？

## 总结
通过此次Google官方例子的学习分析，让我对MVP模式有了更清晰的认识，并且我认为MVP模式的实用性很高。虽然它增加了额外的代码，但是它带来的好处是不言而喻的。在今后的开发中，我想我会尝试着使用它。
